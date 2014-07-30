
#import "QMAOffSiteVC.h"
#import "QMAWebViewController.h"


@interface QMAOffSiteVC ()

@end


@implementation QMAOffSiteVC

#pragma mark - Target Action

- (IBAction)didTapToSeeAboutPanorama:(UIButton *)sender {
    [self performSegueWithIdentifier:@"SegueToWebViewVC" sender:self];
}

- (IBAction)didTapToSeePanorama:(UIButton *)sender {
    [self performSegueWithIdentifier:@"SegueToInstructionsVC" sender:self];
}

#pragma mark - Segue

static NSString *const kAboutThePanoramaHTMLFile = @"About.html";

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    if ([segue.destinationViewController respondsToSelector:@selector(setManagedDocument:)]) {
        [(id)segue.destinationViewController setManagedDocument:self.managedDocument];
    }
    if ([segue.destinationViewController isKindOfClass:[QMAWebViewController class]]) {
        QMAWebViewController *dVC = (QMAWebViewController *) segue.destinationViewController;
        dVC.htmlFileName = kAboutThePanoramaHTMLFile;
    }
}

@end
