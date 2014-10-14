
#import "QMAShareVC.h"


@interface QMAShareVC ()

@end


@implementation QMAShareVC

#pragma mark - Target Action

- (IBAction)didTapToShare:(UIButton *)sender {
    
    NSString *text = @"Checkout The Queens Museum Panorama app";
    NSArray *itemsToShare = @[text];
    
    UIActivityViewController *activityVC = [[UIActivityViewController alloc] initWithActivityItems:itemsToShare
                                                                             applicationActivities:nil];
    activityVC.excludedActivityTypes = @[UIActivityTypePrint,
                                         UIActivityTypeCopyToPasteboard,
                                         UIActivityTypeAssignToContact,
                                         UIActivityTypeSaveToCameraRoll];
    
    [self presentViewController:activityVC animated:YES completion:nil];
}

- (IBAction)didTapToRate:(UIButton *)sender {
    [[UIApplication sharedApplication] openURL:[NSURL URLWithString:@"http://www.queensmuseum.org/"]];
}

- (IBAction)didTapToCloseVC:(UIButton *)sender {
    [self dismissViewControllerAnimated:YES completion:^{}];
}

@end
