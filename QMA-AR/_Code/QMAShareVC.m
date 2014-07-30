
#import "QMAShareVC.h"


@interface QMAShareVC ()

@end


@implementation QMAShareVC

#pragma mark - Target Action

- (IBAction)didTapToCloseVC:(UIButton *)sender {
    [self dismissViewControllerAnimated:YES completion:^{}];
}

@end
